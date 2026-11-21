import { session } from "../../lib/auth.mjs";
import Admin from "./panel";
export const dynamic = "force-dynamic";
export default async function Page() {
  let auth = null;
  try {
    const a = await session(false);
    auth = { phone: a.value.phone, mustRotate: a.value.mustRotate };
  } catch (e) {
    if (e.status !== 401) throw e;
  }
  return <Admin initialAuth={auth} origin={process.env.PUBLIC_ORIGIN || ""} />;
}
