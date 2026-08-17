import { LegalDocumentScreen } from '@/components/perokoko-room/legal-document-screen';
import { PRIVACY_LAST_UPDATED, PRIVACY_SECTIONS } from '@/constants/privacy-content';

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocumentScreen title="プライバシーポリシー" sections={PRIVACY_SECTIONS} lastUpdated={PRIVACY_LAST_UPDATED} />
  );
}
