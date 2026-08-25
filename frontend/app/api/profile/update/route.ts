import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, blood_group, gender, age, phone, name } = body;

        const supabase = await createClient();
        const adminClient = createAdminClient();

        // Get authenticated user if userId is not explicitly provided
        let targetId = userId;
        if (!targetId) {
            const { data: { user } } = await supabase.auth.getUser();
            targetId = user?.id;
        }

        if (!targetId) {
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            );
        }

        const updateData: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        if (blood_group !== undefined) updateData.blood_group = blood_group;
        if (gender !== undefined) updateData.gender = gender;
        if (age !== undefined && age !== '') updateData.age = parseInt(String(age), 10) || null;
        if (phone !== undefined) updateData.phone = phone;
        if (name !== undefined && name.trim() !== '') updateData.name = name.trim();

        // Update in profiles table via admin client to ensure permissions
        const { data: updatedProfile, error: updateError } = await adminClient
            .from('profiles')
            .upsert({
                id: targetId,
                ...updateData,
            })
            .select()
            .maybeSingle();

        if (updateError) {
            console.warn('Profile update error in Supabase:', updateError);
        }

        // Update user metadata in auth if name is changed
        try {
            await adminClient.auth.admin.updateUserById(targetId, {
                user_metadata: {
                    ...(name ? { name: name.trim() } : {}),
                    ...(gender ? { gender } : {}),
                    ...(blood_group ? { blood_group } : {}),
                },
            });
        } catch (metaErr) {
            console.warn('Could not update auth metadata:', metaErr);
        }

        return NextResponse.json({
            success: true,
            message: 'Health profile successfully updated',
            profile: updatedProfile || { id: targetId, ...updateData },
        });
    } catch (err: any) {
        console.error('Error in profile update route:', err);
        return NextResponse.json(
            { error: err?.message || 'Failed to update profile' },
            { status: 500 }
        );
    }
}
