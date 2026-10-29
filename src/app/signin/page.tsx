import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signIn } from "@/auth";
import { FoxMascot } from "@/components/FoxMascot";
import { Footer } from "@/components/Footer";

export default async function SignInPage() {
  const session = await auth();
  if (session) {
    redirect("/");
  }

  return (
    <>
    <div className="signin">
      <section className="signin-hero">
        <h1>
          Calendars are <em>dumb.</em>
        </h1>
        <p>
          One read-only view of every calendar you&apos;re stuck juggling, and
          a booking link that checks all of them before anyone takes your time.
        </p>
        <Link href="/about" className="hero-link">
          Why this exists →
        </Link>
        <div className="signin-fox">
          <FoxMascot corner="inline" size={230} rotate={-5} />
        </div>
      </section>
      <div className="signin-panel">
        <div>
          <h2>Sign in</h2>
          <p className="muted" style={{ margin: 0 }}>
            No password. Use the account you already have.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }}>
            Continue with Google
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await signIn("microsoft-entra-id", { redirectTo: "/" });
          }}
        >
          <button type="submit" className="btn btn-lg" style={{ width: "100%" }}>
            Continue with Microsoft
          </button>
        </form>
        <p className="muted">
          Got a work calendar you don&apos;t have admin rights on? Sign in with
          whichever account you do control, then add the work calendar
          afterwards via its private ICS link from the Sources page.
        </p>

        {process.env.AUTH_DEV_BYPASS === "true" && (
          <>
            <hr style={{ width: "100%", border: "none", borderTop: "1px solid var(--border)" }} />
            <form
              action={async () => {
                "use server";
                await signIn("dev", { redirectTo: "/" });
              }}
            >
              <button type="submit" className="btn" style={{ width: "100%" }}>
                Continue as dev user (local testing only)
              </button>
            </form>
            <p className="muted">
              Dev-only bypass, enabled by AUTH_DEV_BYPASS=true. Skips OAuth so
              you can try the ICS import without setting up Google or
              Microsoft credentials.
            </p>
          </>
        )}
      </div>
    </div>
    <Footer />
    </>
  );
}
