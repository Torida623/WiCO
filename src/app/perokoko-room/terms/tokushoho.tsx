import { LegalDocumentScreen } from '@/components/perokoko-room/legal-document-screen';
import { TOKUSHOHO_LAST_UPDATED, TOKUSHOHO_SECTIONS } from '@/constants/tokushoho-content';

export default function TokushohoScreen() {
  return (
    <LegalDocumentScreen
      title="特定商取引法に基づく表示"
      sections={TOKUSHOHO_SECTIONS}
      lastUpdated={TOKUSHOHO_LAST_UPDATED}
    />
  );
}
