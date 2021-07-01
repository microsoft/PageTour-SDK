import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { FormsComponent } from './forms/forms.component'
import { ListComponent } from './list/list.component'
import { HomeComponent } from './home/home.component'

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'forms', component: FormsComponent },
  { path: 'list', component: ListComponent },
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
