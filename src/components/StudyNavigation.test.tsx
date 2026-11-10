import {fireEvent,render,screen,within} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {Sidebar} from './Sidebar';
import {StudyToolsPage} from '../pages/StudyToolsPage';
import {rememberStudyLocation,readStudyLocation} from '../lib/studyResume';

it('puts the four preferred collections directly in the menu and keeps specialist modules in tools',()=>{
 const navigate=vi.fn(),close=vi.fn();
 render(<Sidebar active="jahshan" onNavigate={navigate} onCloseMobile={close} mobileOpen={false}/>);
 const nav=within(screen.getByRole('navigation',{name:'Main navigation'}));
 expect(nav.getAllByRole('button').map(button=>button.textContent)).toEqual(['Study desk','Benchmark','Jahshan','My OET & AMR files','Recently added','My test reviews']);
 expect(nav.getByRole('button',{name:'Jahshan'})).toHaveAttribute('aria-current','page');
 expect(nav.queryByRole('button',{name:'USMLE study'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'More study tools'}));expect(navigate).toHaveBeenCalledWith('tools');expect(close).toHaveBeenCalled();
});
it('finds a specialist module from any tools category and preserves the old route',()=>{
 const navigate=vi.fn();render(<StudyToolsPage onNavigate={navigate}/>);
 fireEvent.change(screen.getByRole('searchbox',{name:'Find a study tool'}),{target:{value:'USMLE'}});
 fireEvent.click(screen.getByRole('button',{name:/USMLE study/}));expect(navigate).toHaveBeenCalledWith('usmle');
});
it('returns to the last collection page without replacing it with settings or another tool',()=>{
 rememberStudyLocation({section:'materials',itemId:'my-source-file'});rememberStudyLocation({section:'tools'});rememberStudyLocation({section:'reviews'});
 expect(readStudyLocation()).toMatchObject({section:'materials',itemId:'my-source-file'});
 localStorage.setItem('oet-last-study-location-v1','{"section":"not-a-route"}');expect(readStudyLocation()).toBeNull();
});
