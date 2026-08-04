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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { action, data } = await req.json();

    switch (action) {
      case "list": {
        const { data: patients, error } = await supabaseClient
          .from("patients")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ patients }), { headers: corsHeaders });
      }

      case "get": {
        const { data: patient, error } = await supabaseClient
          .from("patients")
          .select("*")
          .eq("id", data.id)
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ patient }), { headers: corsHeaders });
      }

      case "create": {
        const { data: patient, error } = await supabaseClient
          .from("patients")
          .insert({
            ...data,
          })
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ patient }), { headers: corsHeaders });
      }

      case "update": {
        const { id, ...updateData } = data;
        const { data: patient, error } = await supabaseClient
          .from("patients")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ patient }), { headers: corsHeaders });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: corsHeaders,
        });
    }
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
