/** Test-only future content; never imported by production source or copied to public/. */
export const SYNTHETIC_FORM_LANGUAGES = ['en', 'he', 'es', 'fr', 'de', 'it', 'pt'];
export const SYNTHETIC_FORMS = SYNTHETIC_FORM_LANGUAGES.flatMap(language =>
  ['children', 'adolescents'].flatMap(audience => ['core', 'specialized'].flatMap(collectionType => {
    const collectionId = `qa-${audience}-${collectionType}-${language}`;
    const category = `${audience}_cbt_${collectionType}`;
    return ['combined', 'worksheet'].map((kind, index) => {
      const id = `${collectionId}-${kind}`;
      const title = language === 'he' ? (kind === 'worksheet' ? 'דף בדיקה חדש' : 'יחידת בדיקה חדשה') : `Synthetic ${kind}`;
      const fileUrl = `/forms/${language}/${audience}/qa/${id}.pdf`;
      return {
        id, slug: id, title, description: title, approved: true, language, audience, category,
        collectionId, collectionType, cardType: kind === 'worksheet' ? 'worksheet' : 'combined_pdf',
        type: kind === 'worksheet' ? 'individual_worksheet' : 'module_pdf',
        parentId: `${collectionId}-unit`, moduleNumber: 1, moduleCode: '01', stageNumber: 1,
        moduleTitle: title, formNumber: '1.1', displayOrder: index + 1, clinicalDomain: 'general_cbt',
        isCombinedPdf: kind === 'combined', fileUrl, filePath: `public${fileUrl}`,
        file_path: `public${fileUrl}`, therapeuticGoal: 'Synthetic practice', whenToUse: 'Synthetic request',
        clinicalKeywords: ['synthetic', 'practice'], intentPhrases: [`qa request ${id}`],
        languages: { [language]: { title, description: title, file_url: fileUrl,
          file_type: 'pdf', file_name: `${id}.pdf`, rtl: language === 'he' } },
      };
    });
  })),
);
