import {Machine, MachineGUIAction} from "./machine";
import {Level} from "./levels";
import {Injectable} from "@angular/core";
import {Parser} from "./parser";

@Injectable({providedIn: 'root'})
export class MachineGuiExecutor{
  private determineCode: () => string;
  private level: Level;
  private machineGUI: MachineGUI;
  private delayInMs: number = 1000;

  private actions: MachineGUIAction[] = []
  private timer: NodeJS.Timer | undefined
  private finished: boolean = false

  setDetermineCode(determineCode: () => string) {
    this.determineCode = determineCode;
  }

  setLevel(level: Level) {
    this.level = level
    if (this.machineGUI != undefined) {
      this.machineGUI.initialize(this.level)
      this.machineGUI.detectChanges()
    }
  }

  setMachineGUI(machineGUI: MachineGUI) {
    this.machineGUI = machineGUI;
    if (this.level != undefined) {
      this.machineGUI.initialize(this.level)
      this.machineGUI.detectChanges()
    }
  }

  initialize() {
    this.actions = new Parser(new Machine(this.level)).parse(this.determineCode())
    this.finished = false
  }

  isReadyForExecution(): boolean {
    return this.actions.length > 0
  }

  execute() {
    // The trick to add delays in between also applies to the first element. So we do this one manually.
    this.handleNext()
    this.executeDelayed()
  }

  isRunning(): boolean {
    return this.timer != undefined
  }

  isFinished(): boolean {
    return this.finished
  }

  updateDelayInMs(delayInMs: number) {
    this.delayInMs = delayInMs

    // Update the current running sequence with the new value.
    if (this.isRunning()) {
      this.pause()
      this.executeDelayed()
    }
  }

  singleStep() {
    if (this.timer != undefined) {
      throw Error("Cannot do single step while executor is running")
    }

    this.handleNext()
  }

  stopAndClear() {
    this.pause()
    this.actions = []
    this.machineGUI.initialize(this.level)
  }

  pause(): void {
    if (this.timer != undefined) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }

  private executeDelayed() {
    this.timer = setInterval(() => {
      this.handleNext()
    }, this.delayInMs)
  }

  private handleNext(): boolean | void {
    if (this.finished) {
      return true
    }

    const action = this.actions.shift()
    if (action == undefined) {
      this.pause()
      return
    }

    const result = this.machineGUI.handle(action);
    this.machineGUI.detectChanges()
    if (result != undefined) {
      this.finished = true
      return result;
    }
  }

}

export interface MachineGUI {
  detectChanges(): void;

  initialize(level: Level): void;

  handle(machineGUIAction: MachineGUIAction): boolean | void;
}
