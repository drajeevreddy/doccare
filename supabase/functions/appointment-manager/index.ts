import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { action, data } = await req.json();

    switch (action) {
      case "list": {
        const { data: appointments, error } = await supabaseClient
          .from("appointments")
          .select("*, patient:patients(*), doctor:profiles(*)")
          .order("appointment_date", { ascending: true })
          .order("start_time", { ascending: true });
        if (error) throw error;
        return new Response(JSON.stringify({ appointments }), { headers: corsHeaders });
      }

      case "create": {
        const { data: appointment, error } = await supabaseClient
          .from("appointments")
          .insert({ ...data, created_by: user.id })
          .select()
          .single();
        if (error) throw error;

        await supabaseClient.from("activity_logs").insert({
          user_id: user.id,
          action: "CREATE_APPOINTMENT",
          resource_type: "appointment",
          resource_id: appointment.id,
          details: { patient_id: data.patient_id, date: data.appointment_date },
        });

        return new Response(JSON.stringify({ appointment }), { headers: corsHeaders });
      }

      case "update-status": {
        const { data: appointment, error } = await supabaseClient
          .from("appointments")
          .update({ status: data.status })
          .eq("id", data.id)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ appointment }), { headers: corsHeaders });
      }

      case "today": {
        const { data: appointments, error } = await supabaseClient
          .from("appointments")
          .select("*, patient:patients(*), doctor:profiles(*)")
          .eq("appointment_date", new Date().toISOString().split("T")[0])
          .order("start_time", { ascending: true });
        if (error) throw error;
        return new Response(JSON.stringify({ appointments }), { headers: corsHeaders });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
    }
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
