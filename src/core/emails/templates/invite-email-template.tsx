import * as React from "react";

import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from "@react-email/components";

export interface InviteEmailProps {
  previewText: string;
  appName: string;
  appUrl: string;
  inviteLink: string;
  username: string;
  invitedByName: string;
  invitedByEmail: string;
  teamName?: string;
  logoUrl?: string;
  inviterImage?: string;
  teamImage?: string;
  inviteFromIp?: string;
  inviteFromLocation?: string;
}

export const InviteEmailTemplate = ({
  previewText,
  appName,
  appUrl,
  inviteLink,
  username,
  invitedByName,
  invitedByEmail,
  teamName,
  logoUrl,
  inviterImage,
  teamImage,
  inviteFromIp,
  inviteFromLocation,
}: InviteEmailProps) => {
  return (
    <Html>
      <Head />

      <Preview>{previewText}</Preview>

      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            {/* Logo */}
            {logoUrl && (
              <Section className="mt-[20px] text-center">
                <Img src={logoUrl} width="40" height="40" alt={appName} />
              </Section>
            )}

            {/* Heading */}
            <Heading className="text-center text-[24px] font-normal text-black my-[30px]">
              You're invited to join {teamName ? `${teamName} on` : ""}{" "}
              <strong>{appName}</strong> 💬
            </Heading>

            {/* Greeting */}
            <Text className="text-[14px] leading-[24px] text-black">
              Hi {username},
            </Text>

            <Text className="text-[14px] leading-[24px] text-black">
              <strong>{invitedByName}</strong> (
              <Link href={`mailto:${invitedByEmail}`}>{invitedByEmail}</Link>)
              has invited you to start chatting on <strong>{appName}</strong>.
            </Text>

            {/* Images */}
            {(inviterImage || teamImage) && (
              <Section className="my-[24px]">
                <Row>
                  {inviterImage && (
                    <Column align="right">
                      <Img
                        className="rounded-full"
                        src={inviterImage}
                        width="64"
                        height="64"
                        alt={`${invitedByName}`}
                      />
                    </Column>
                  )}

                  {teamImage && (
                    <Column align="left">
                      <Img
                        className="rounded-full"
                        src={teamImage}
                        width="64"
                        height="64"
                        alt={teamName ?? "Team"}
                      />
                    </Column>
                  )}
                </Row>
              </Section>
            )}

            {/* CTA */}
            <Section className="text-center my-[32px]">
              <Button
                href={inviteLink}
                className="rounded bg-black px-5 py-3 text-[12px] font-semibold text-white no-underline"
              >
                Accept Invitation
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] text-black">
              Or copy and paste this link into your browser:
            </Text>

            <Link href={inviteLink}>{inviteLink}</Link>

            <Hr className="my-[26px]" />

            {/* Footer */}
            <Text className="text-[12px] text-[#666666] leading-[20px]">
              This invitation was sent to {username}.
              {inviteFromIp && <> Request originated from IP {inviteFromIp}.</>}
              {inviteFromLocation && <> Location: {inviteFromLocation}.</>} If
              you weren't expecting this, you can safely ignore this email.
            </Text>

            <Text className="text-center text-[12px] text-gray-500 mt-[20px]">
              © {new Date().getFullYear()} {appName}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
