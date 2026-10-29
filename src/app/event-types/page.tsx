import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { TopBar } from "@/components/TopBar";
import { createEventType, deleteEventType } from "@/lib/booking/actions";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ensureUsername } from "@/lib/username";
import { Footer } from "@/components/Footer";
import { SubmitButton } from "@/components/SubmitButton";

export default async function EventTypesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const prisma = await getPrisma();
  const [username, eventTypes] = await Promise.all([
    ensureUsername(prisma, session.user.id),
    prisma.eventType.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <>
      <TopBar active="event-types" />
      <main className="page">
        <header className="page-head">
          <h1>Event types</h1>
          <p>
            Each one gets its own public booking link. Set your weekly hours on
            Availability and a booking calendar on Sources before sharing one.
          </p>
        </header>

        <section className="split">
          <div className="split-label">
            <h2>Your event types</h2>
            <p>Copy a link and send it to anyone.</p>
          </div>
          <div className="panel flush">
            {eventTypes.length === 0 && (
              <p className="empty-small">No event types yet. Add your first below.</p>
            )}
            {eventTypes.map((et) => (
              <div className="item" key={et.id}>
                <div className="duration" aria-label={`${et.durationMinutes} minutes`}>
                  <strong>{et.durationMinutes}</strong>
                  <span>min</span>
                </div>
                <div className="item-main">
                  <div className="item-title">{et.name}</div>
                  <div className="item-sub">
                    <code>/book/{username}/{et.slug}</code>
                    {et.description ? ` · ${et.description}` : ""}
                  </div>
                </div>
                <div className="item-actions">
                  <CopyLinkButton path={`/book/${username}/${et.slug}`} />
                  <form
                    action={async () => {
                      "use server";
                      await deleteEventType(et.id);
                    }}
                  >
                    <SubmitButton className="btn btn-danger" pendingLabel="Deleting…">
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="split">
          <div className="split-label">
            <h2>Add an event type</h2>
            <p>Buffers keep time free before and after each meeting.</p>
          </div>
          <div className="panel">
            <form
              action={async (formData: FormData) => {
                "use server";
                await createEventType({
                  name: String(formData.get("name") ?? ""),
                  description: String(formData.get("description") ?? ""),
                  durationMinutes: Number(formData.get("durationMinutes") ?? 30),
                  bufferBeforeMinutes: Number(formData.get("bufferBefore") ?? 0),
                  bufferAfterMinutes: Number(formData.get("bufferAfter") ?? 0),
                });
              }}
              className="stack"
            >
              <div className="fields">
                <label className="field">
                  Name
                  <input type="text" name="name" placeholder="30-min consult" required />
                </label>
                <label className="field">
                  Description
                  <input type="text" name="description" placeholder="Optional" />
                </label>
                <label className="field">
                  Duration (min)
                  <input type="number" name="durationMinutes" defaultValue={30} min={5} step={5} />
                </label>
                <label className="field">
                  Buffer before (min)
                  <input type="number" name="bufferBefore" defaultValue={0} min={0} step={5} />
                </label>
                <label className="field">
                  Buffer after (min)
                  <input type="number" name="bufferAfter" defaultValue={0} min={0} step={5} />
                </label>
              </div>
              <div>
                <SubmitButton className="btn btn-primary" pendingLabel="Adding…">
                  Add event type
                </SubmitButton>
              </div>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
