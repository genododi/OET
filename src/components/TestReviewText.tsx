import {Fragment} from 'react';
const inline=(text:string)=>text.split(/\*\*(.*?)\*\*/g).map((part,index)=>index%2?<strong key={index}>{part}</strong>:<Fragment key={index}>{part}</Fragment>);
export function TestReviewText({text}:{text:string}) {
  const blocks=text.split(/\n\s*\n/).filter(block=>block.trim());
  return <div className="test-review-text">{blocks.map((block,index)=>{
    const lines=block.trim().split('\n');
    const heading=/^(?:#{1,6}\s+|\*\*).+/.test(lines[0]) || /^(?:\d+[.)]\s*)?(?:Mistakes to revisit|Important points[^\n]*|New learning[^\n]*|My next practice|Coverage[^\n]*)\s*:?.*$/i.test(lines[0]);
    const title=heading?lines.shift()!.replace(/^#{1,6}\s+/,'').replaceAll('**',''):null;
    const body=!lines.length?null:lines.every(line=>/^\s*[-*•]\s/.test(line))?<ul>{lines.map((line,i)=><li key={i}>{inline(line.replace(/^\s*[-*•]\s/,''))}</li>)}</ul>:lines.length?<p>{inline(lines.join('\n'))}</p>:null;
    return <Fragment key={index}>{title&&<h4>{title}</h4>}{body}</Fragment>;
  })}</div>;
}
