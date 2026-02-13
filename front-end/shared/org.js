const ORG_CACHE_KEY = "medlux:current_org_id";

const getSupabaseClient = () => window.supabaseClient || window.supabase || null;

const getCurrentOrgId = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh) {
    const cached = sessionStorage.getItem(ORG_CACHE_KEY) || localStorage.getItem(ORG_CACHE_KEY);
    if (cached) return cached;
  }

  const supabase = getSupabaseClient();
  if (!supabase?.auth?.getUser || !supabase?.from) return "";

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const userId = authData?.user?.id;
  if (!userId) return "";

  const { data, error } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  const orgId = data?.organization_id || "";
  if (orgId) {
    sessionStorage.setItem(ORG_CACHE_KEY, orgId);
    localStorage.setItem(ORG_CACHE_KEY, orgId);
  }
  return orgId;
};

export {
  getCurrentOrgId
};
