import {TestReviewText} from './TestReviewText';
import {queueTestReview,useTestReviews} from '../lib/testReviews';
export function CompletedTestReview({completionId}:{completionId:string}) {
  const review=useTestReviews().find(review=>review.completionId===completionId);
  if(!review)return null;
  return <details key={review.id} className="completed-test-review" open={review.state==='complete'}><summary>Mentor review · {review.state==='complete'?'saved':review.state.replaceAll('-',' ')}</summary>{review.text&&<TestReviewText text={review.text}/>}{review.message&&<p role="status">{review.message}</p>}{(review.state==='queued'||review.state==='writing')&&<p role="status">Your mentor is writing a review of this test. It will be saved automatically; you can keep studying.</p>}{['failed','needs-response','needs-ai'].includes(review.state)&&<button className="btn btn-secondary btn-sm" onClick={()=>queueTestReview(completionId,review.title)}>Retry mentor review</button>}<a href="#reviews">All my test reviews →</a></details>;
}
