import {useEffect,useState} from 'react';
import {finishReviewEvent,queueTestReview,useTestReviews,recoverInterruptedReviews} from '../lib/testReviews';
export function AutomaticTestReviews({onOpen}:{onOpen:()=>void}) {
  const reviews=useTestReviews(),[storageError,setStorageError]=useState(false);
  useEffect(()=>{
    recoverInterruptedReviews();
    const finish=(event:Event)=>{const value=(event as CustomEvent).detail;if(typeof value?.completionId==='string'&&typeof value?.title==='string')queueTestReview(value.completionId,value.title);};
    const unavailable=()=>setStorageError(true);
    window.addEventListener(finishReviewEvent,finish);window.addEventListener('oet-test-review-storage-error',unavailable);
    return()=>{window.removeEventListener(finishReviewEvent,finish);window.removeEventListener('oet-test-review-storage-error',unavailable);};
  },[]);
  const pending=reviews.filter(review=>review.state==='queued'||review.state==='writing');
  if(!pending.length&&!storageError)return null;
  return <div className="test-review-status" role="status"><span>{storageError?'The mentor review could not be saved. Your existing study data is unchanged.':`Mentor review ${pending.some(review=>review.state==='writing')?'in progress':'queued'} · ${pending[0].title}`}</span><button type="button" onClick={onOpen}>View reviews →</button></div>;
}
