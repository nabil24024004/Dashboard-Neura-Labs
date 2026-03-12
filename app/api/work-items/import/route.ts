import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { queryDocs } from "@/lib/firebase/db";

interface ImportAssignment {
    member: string;
    role?: string;
}

interface ImportWorkItem {
    title?: string;
    category?: string;
    description?: string;
    estimated_hours?: number;
    due_date?: string;
    assignments?: ImportAssignment[];
}

interface ImportPayload {
    project?: { name?: string; description?: string };
    work_items?: ImportWorkItem[];
}

interface ValidationError {
    path: string;
    message: string;
    value?: unknown;
}

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null) as ImportPayload | null;
    if (!body || !Array.isArray(body.work_items)) {
        return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
    }

    // Fetch all team members for name matching
    const teamMembers = await queryDocs("users");

    function findMember(name: string) {
        const lower = name.toLowerCase().trim();
        return teamMembers.find((m) => {
            const fullName = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim().toLowerCase();
            const firstName = (m.first_name as string ?? "").toLowerCase();
            const lastName = (m.last_name as string ?? "").toLowerCase();
            return fullName === lower || firstName === lower || lastName === lower;
        });
    }

    // Validate
    const errors: ValidationError[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    body.work_items.forEach((item, i) => {
        const prefix = `work_items[${i}]`;

        if (!item.title || typeof item.title !== "string" || item.title.trim().length === 0) {
            errors.push({ path: `${prefix}.title`, message: "Title is required", value: item.title });
        } else if (item.title.length > 300) {
            errors.push({ path: `${prefix}.title`, message: "Title must be 300 characters or less", value: item.title });
        }

        if (item.due_date) {
            const d = new Date(item.due_date);
            if (Number.isNaN(d.getTime())) {
                errors.push({ path: `${prefix}.due_date`, message: "Invalid date format", value: item.due_date });
            } else if (d < today) {
                errors.push({ path: `${prefix}.due_date`, message: `Date "${item.due_date}" is in the past`, value: item.due_date });
            }
        }

        if (item.estimated_hours !== undefined && item.estimated_hours !== null) {
            if (typeof item.estimated_hours !== "number" || item.estimated_hours <= 0) {
                errors.push({ path: `${prefix}.estimated_hours`, message: "Must be a positive number", value: item.estimated_hours });
            }
        }

        if (!Array.isArray(item.assignments) || item.assignments.length === 0) {
            errors.push({ path: `${prefix}.assignments`, message: "At least one assignment is required" });
        } else {
            let leadCount = 0;
            item.assignments.forEach((a, j) => {
                if (!a.member || typeof a.member !== "string" || a.member.trim().length === 0) {
                    errors.push({ path: `${prefix}.assignments[${j}].member`, message: "Member name is required" });
                    return;
                }
                const found = findMember(a.member);
                if (!found) {
                    errors.push({
                        path: `${prefix}.assignments[${j}].member`,
                        message: `"${a.member}" does not match any team member. Check spelling or use the member's exact display name.`,
                        value: a.member,
                    });
                }
                const role = a.role || "assignee";
                if (!["lead", "assignee", "reviewer"].includes(role)) {
                    errors.push({ path: `${prefix}.assignments[${j}].role`, message: `Invalid role "${role}"`, value: role });
                }
                if (role === "lead") leadCount++;
            });

            if (leadCount === 0) {
                errors.push({
                    path: `${prefix}.assignments`,
                    message: 'No lead assigned. Each work item must have exactly one member with "role": "lead".',
                });
            } else if (leadCount > 1) {
                errors.push({
                    path: `${prefix}.assignments`,
                    message: `Multiple leads assigned (${leadCount}). Each work item must have exactly one lead.`,
                });
            }
        }
    });

    if (errors.length > 0) {
        return NextResponse.json({ errors, valid: false }, { status: 422 });
    }

    // Parse validated items into structured data for the client to use in Step 2
    const parsedItems = body.work_items.map((item, i) => {
        const assignments = (item.assignments ?? []).map((a) => {
            const member = findMember(a.member)!;
            return {
                member_id: member.id,
                member_name: `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim(),
                role_on_item: a.role || "assignee",
            };
        });

        return {
            title: item.title!.trim(),
            category: item.category?.trim() || "General",
            description: item.description?.trim() || "",
            estimated_hours: item.estimated_hours ?? null,
            due_date: item.due_date ?? null,
            sort_order: i,
            assignments,
        };
    });

    return NextResponse.json({
        valid: true,
        parsed_items: parsedItems,
        project_overrides: body.project
            ? {
                name: body.project.name?.trim() || null,
                description: body.project.description?.trim() || null,
            }
            : null,
    });
}
