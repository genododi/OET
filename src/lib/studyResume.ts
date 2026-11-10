import type { AppRoute } from './routing';
import { priorityCollections } from './studyNavigation';
const key='oet-last-study-location-v1';
export function rememberStudyLocation(route:AppRoute) {
  if(!priorityCollections.some(item=>item.id===route.section))return;
  try{localStorage.setItem(key,JSON.stringify(route));}catch{/* Study also works without storage. */}
}
export function readStudyLocation():(AppRoute & {label:string})|null {
  try{
    const value=JSON.parse(localStorage.getItem(key) ?? 'null');
    const collection=priorityCollections.find(item=>item.id===value?.section);
    if(!collection || value.itemId!==undefined && (typeof value.itemId!=='string'||value.itemId.length>200))return null;
    return {section:collection.id,itemId:value.itemId,label:collection.label,...(collection.id==='materials'&&value.returnTo==='recent'?{returnTo:'recent' as const}:{})};
  }catch{return null;}
}
