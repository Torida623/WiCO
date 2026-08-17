import { LegalDocumentScreen } from '@/components/perokoko-room/legal-document-screen';
import { TERMS_LAST_UPDATED, TERMS_SECTIONS } from '@/constants/terms-content';

export default function TermsServiceScreen() {
  return <LegalDocumentScreen title="利用規約" sections={TERMS_SECTIONS} lastUpdated={TERMS_LAST_UPDATED} />;
}
