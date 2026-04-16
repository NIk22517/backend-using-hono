import { resend, resendConfig } from "../../config/resend.config";
import { InviteEmailTemplate } from "../../core/emails/templates/invite-email-template";
import { type ChatInvite } from "../../db/inviteSchema";

export const inviteEmailSend = async ({
  invite,
}: {
  invite: ChatInvite & { name: string; email: string };
}) => {
  const links = `${resendConfig.app.url}/invite/accept?token=${invite.token}`;

  return resend.emails.send({
    from: resendConfig.from.default,
    to: invite.invitee_email ?? "",
    subject: `${resendConfig.app.name} Invite`,
    react: (
      <InviteEmailTemplate
        appName={resendConfig.app.name}
        appUrl={resendConfig.app.url}
        inviteLink={links}
        invitedByEmail={invite.email}
        invitedByName={invite.name}
        previewText={`You were invited to ${resendConfig.app.name}`}
        username={invite.invitee_email ?? ""}
      />
    ),
  });
};
