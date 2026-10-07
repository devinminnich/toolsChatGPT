import { expect, test } from "@playwright/test";
import { catalog } from "../src/domain/catalog";
import { completeSet, emptyState, prescription, startSession } from "../src/domain/model";
const workout = { id: "plugin-workout", name: "Plugin shoulder session", unit: "lb" as const, exercises: [prescription("seated-dumbbell-shoulder-press")] };
workout.exercises[0].sets.forEach((s) => { s.weight = 30; s.reps = 10; });
const active = startSession(workout, catalog, "lb");
const initial = { ...emptyState(), profile: { name: "Test athlete", goal: "Build muscle", unit: "lb", equipment: ["Dumbbell"], involvement: "Coach", autonomy: "Suggest only" }, workouts: [workout], active: completeSet(active, active.exercises[0].id, active.exercises[0].sets[0].id) };
test("replicated workout UI saves through MCP, receives AI advice, applies and undoes it, and retains history", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/plugin-host", (route) => route.fulfill({ contentType: "text/html", body: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body style="margin:0"><iframe title="Fitness Coach" src="/plugin.html" style="width:100%;height:100dvh;border:0"></iframe><script>
    let state=${JSON.stringify(initial)},revision=1,proposals=[];
    window.calls=[];
    addEventListener('message',event=>{
      const m=event.data;if(!m||m.jsonrpc!=='2.0'||m.id===undefined)return;
      calls.push(m.method);let result={};
      if(m.method==='ui/initialize')result={protocolVersion:'2026-01-26',hostInfo:{name:'Test host',version:'1.0'},hostCapabilities:{serverTools:{},message:{text:{}},updateModelContext:{text:{}}},hostContext:{theme:'dark',displayMode:'inline',availableDisplayModes:['inline','fullscreen','pip']}};
      if(m.method==='tools/call'){
        const n=m.params.name,a=m.params.arguments||{};
        if(n==='open_fitness_app')result={content:[],structuredContent:{revision,workoutCount:state.workouts.length,completedCount:state.history.length,activeName:state.active?.name},_meta:{state}};
        if(n==='save_training_state'){
          if(a.revision!==revision)result={isError:true,content:[{type:'text',text:'Workout changed in another view. Reload before saving.'}]};
          else{state=a.state;revision++;result={content:[],structuredContent:{revision}};}
        }
        if(n==='list_coach_proposals')result={content:[],structuredContent:{proposals}};
        if(n==='review_coach_proposal'){proposals=proposals.filter(p=>p.id!==a.id);result={content:[],structuredContent:{reviewed:true}};}
      }
      if(m.method==='ui/message'){
        const e=state.active.exercises[0],s=e.sets[1];
        proposals=[{id:'11111111-1111-4111-8111-111111111111',requestId:'test',createdAt:new Date().toISOString(),payload:{kind:'set',title:'Adjust next shoulder set',message:'Keep clean reps. Try 25 lb for 8 reps.',sessionId:state.active.id,exerciseId:e.id,setId:s.id,before:{weight:s.weight,reps:s.reps,duration:s.duration,distance:s.distance},after:{weight:25,reps:8}}}];
      }
      event.source.postMessage({jsonrpc:'2.0',id:m.id,result},'*');
    });
  </script></body></html>` }));
  await page.goto("/plugin-host");
  if (test.info().project.name === "phone") expect((await page.locator("iframe").boundingBox())!.width).toBeLessThan(500);
  const ui = page.frameLocator('iframe[title="Fitness Coach"]');
  await expect(ui.getByRole("heading", { name: "Plugin shoulder session", exact: true })).toBeVisible();
  await expect(ui.getByText("Saved to your account", { exact: false }).first()).toBeVisible();
  await ui.getByRole("button", { name: /AI Coach/, exact: false }).last().click();
  await ui.getByLabel("Ask your AI Coach", { exact: true }).fill("What should I do next set?");
  await ui.getByRole("button", { name: "Send to AI Coach", exact: true }).click();
  await expect(ui.getByText("Sent to your ChatGPT coach.", { exact: false })).toBeVisible();
  await ui.getByRole("button", { name: "Refresh coach replies", exact: true }).click();
  await expect(ui.getByRole("heading", { name: "Adjust next shoulder set" })).toBeVisible();
  await page.screenshot({ path: `plugin-advice-${test.info().project.name}.png`, fullPage: true });
  await ui.getByRole("button", { name: "Apply to this set", exact: true }).click();
  await expect(ui.getByText("Coach suggestion applied and saved.")).toBeVisible();
  await ui.getByRole("button", { name: "Undo last AI set adjustment", exact: true }).click();
  await expect(ui.getByText("Set adjustment undone.")).toBeVisible();
  await ui.getByRole("button", { name: /Today/ }).last().click();
  await ui.getByRole("button", { name: "Finish workout", exact: true }).click();
  await expect(ui.getByRole("dialog", { name: "Confirm workout action" })).toBeVisible();
  await ui.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(ui.getByRole("heading", { name: "Plugin shoulder session", exact: true })).toBeVisible();
  const frame = page.frames().find((f) => f.url().endsWith("/plugin.html"))!;
  await frame.goto("/plugin.html");
  await ui.getByRole("button", { name: /History/ }).last().click();
  await expect(ui.getByRole("heading", { name: "Plugin shoulder session", exact: true })).toBeVisible();
  await ui.getByRole("button", { name: /AI Coach/ }).last().click();
  await expect(ui.getByRole("heading", { name: "AI Coach", exact: true })).toBeVisible();
  await page.screenshot({ path: `plugin-${test.info().project.name}.png`, fullPage: true });
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => (window as any).calls)).toContain("ui/update-model-context");
});
