export function createPageUrl(pageName: string, queryString?: string) {
    const path = '/' + pageName.replace(/ /g, '-');
    return queryString ? `${path}?${queryString}` : path;
}