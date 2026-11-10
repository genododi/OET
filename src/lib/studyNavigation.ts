import type { NavSection } from '../types';
import type { AppIconName } from '../components/AppIcon';

export const priorityCollections: {id: NavSection; label: string; description: string; icon: AppIconName; accent: string}[] = [
  {id:'benchmark',label:'Benchmark',description:'Work through the original tests, one skill at a time.',icon:'exam',accent:'teal'},
  {id:'jahshan',label:'Jahshan',description:'Your Reading and Listening books, questions and recordings.',icon:'book',accent:'blue'},
  {id:'materials',label:'My OET & AMR files',description:'Study your supplied papers and keep your responses with the source.',icon:'folder',accent:'amber'},
  {id:'recent',label:'Recently added',description:'Find the latest additions to your study files.',icon:'sparkles',accent:'violet'},
];
export const mainStudyNavigation = [
  {id:'home' as NavSection,label:'Study desk',icon:'dashboard' as AppIconName},
  ...priorityCollections,
  {id:'reviews' as NavSection,label:'My test reviews',icon:'trend' as AppIconName},
];
export function navigationParent(section:NavSection):NavSection {
  if(mainStudyNavigation.some(item=>item.id===section) || section==='tools')return section;
  return 'tools';
}
export const studyTools: {id:NavSection;label:string;description:string;category:'practice'|'guidance'|'planning';icon:AppIconName}[] = [
  {id:'practice',label:'Official exam practice',description:'Original Listening, Reading, Writing and Speaking samples.',category:'practice',icon:'target'},
  {id:'mock',label:'Timed mock exams',description:'Practise a full sitting or a single exam section.',category:'practice',icon:'exam'},
  {id:'walkthrough',label:'Exam walkthroughs',description:'Work through an example and understand its reasoning.',category:'practice',icon:'guide'},
  {id:'listening',label:'Original listening archive',description:'Human recordings with their matching papers.',category:'practice',icon:'headphones'},
  {id:'drills',label:'Learning exercises',description:'Short supplementary exercises for a focused skill.',category:'practice',icon:'pen'},
  {id:'mentor',label:'Your OET Mentor',description:'Ask about an explanation, a draft or a practice method.',category:'guidance',icon:'message'},
  {id:'notebook',label:'NotebookLM notes',description:'Your saved notes and writing checklists.',category:'guidance',icon:'book'},
  {id:'guide',label:'Study guide',description:'Exam methods and preparation guidance.',category:'guidance',icon:'guide'},
  {id:'tips',label:'Tips & tricks',description:'Practical suggestions for the four skills.',category:'guidance',icon:'lightbulb'},
  {id:'pearls',label:'Pearls & pitfalls',description:'Useful habits and points that are easy to miss.',category:'guidance',icon:'pulse'},
  {id:'books',label:'Book PDFs',description:'Books and reference papers from your collection.',category:'guidance',icon:'book'},
  {id:'mistakes',label:'Mistake notebook',description:'Return to your scored practice feedback.',category:'planning',icon:'pen'},
  {id:'planner',label:'My study plan',description:'Set a baseline and choose your next focus.',category:'planning',icon:'plan'},
  {id:'dashboard',label:'Detailed dashboard',description:'Scored session history and advanced training tools.',category:'planning',icon:'trend'},
  {id:'resources',label:'Source library',description:'Source links and learning maps.',category:'planning',icon:'folder'},
  {id:'usmle',label:'USMLE study',description:'Step 1 and Step 2 CK questions and textbook revision.',category:'planning',icon:'activity'},
  {id:'app',label:'App & offline study',description:'Installation, offline access and study profiles.',category:'planning',icon:'settings'},
];
