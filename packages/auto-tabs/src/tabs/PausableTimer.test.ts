import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PausableTimer } from "./PausableTimer";

describe("PausableTimer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("calls onComplete after the full duration", () => {
    const onComplete = vi.fn();
    new PausableTimer(1000, onComplete).start();
    vi.advanceTimersByTime(999);
    expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("does not fire early if paused partway through", () => {
    const onComplete = vi.fn();
    const timer = new PausableTimer(1000, onComplete);
    timer.start();
    vi.advanceTimersByTime(400);
    timer.pause();
    vi.advanceTimersByTime(1000);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("resumes with only the remaining time, not the full duration", () => {
    const onComplete = vi.fn();
    const timer = new PausableTimer(1000, onComplete);
    timer.start();
    vi.advanceTimersByTime(400);
    timer.pause();
    timer.resume();
    vi.advanceTimersByTime(599);
    expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("cancel prevents onComplete from ever firing", () => {
    const onComplete = vi.fn();
    const timer = new PausableTimer(1000, onComplete);
    timer.start();
    vi.advanceTimersByTime(500);
    timer.cancel();
    vi.advanceTimersByTime(10000);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("pause is a no-op when already paused (doesn't double-subtract remaining time)", () => {
    const onComplete = vi.fn();
    const timer = new PausableTimer(1000, onComplete);
    timer.start();
    vi.advanceTimersByTime(400);
    timer.pause();
    timer.pause();
    timer.resume();
    vi.advanceTimersByTime(599);
    expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("start is a no-op when already running (doesn't reset the clock)", () => {
    const onComplete = vi.fn();
    const timer = new PausableTimer(1000, onComplete);
    timer.start();
    vi.advanceTimersByTime(500);
    timer.start();
    vi.advanceTimersByTime(500);
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
