"""
NativeCopy Native Pointer & OS Controller
Zero-dependency, hardware-accelerated OS mouse & keyboard automation.
Supports macOS (CoreGraphics) and Windows (user32).
"""

import sys
import platform
import ctypes
import time
from typing import Tuple, Optional, Dict, Any

OS_NAME = platform.system()

# ----------------- macOS Implementation (CoreGraphics) -----------------
if OS_NAME == "Darwin":
    try:
        cg = ctypes.cdll.LoadLibrary("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics")

        class CGPoint(ctypes.Structure):
            _fields_ = [("x", ctypes.c_double), ("y", ctypes.c_double)]

        # Function signatures
        cg.CGEventCreate.restype = ctypes.c_void_p
        cg.CGEventCreate.argtypes = [ctypes.c_void_p]

        cg.CGEventGetLocation.restype = CGPoint
        cg.CGEventGetLocation.argtypes = [ctypes.c_void_p]

        cg.CGEventCreateMouseEvent.restype = ctypes.c_void_p
        cg.CGEventCreateMouseEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint32, CGPoint, ctypes.c_uint32]

        cg.CGEventCreateScrollWheelEvent.restype = ctypes.c_void_p
        cg.CGEventCreateScrollWheelEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32, ctypes.c_int32, ctypes.c_int32]

        cg.CGEventCreateKeyboardEvent.restype = ctypes.c_void_p
        cg.CGEventCreateKeyboardEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint16, ctypes.c_bool]

        cg.CGEventSetFlags.argtypes = [ctypes.c_void_p, ctypes.c_uint64]
        cg.CGEventPost.argtypes = [ctypes.c_uint32, ctypes.c_void_p]

        # Constants
        kCGHIDEventTap = 0
        kCGEventNull = 0
        kCGEventLeftMouseDown = 1
        kCGEventLeftMouseUp = 2
        kCGEventRightMouseDown = 3
        kCGEventRightMouseUp = 4
        kCGEventMouseMoved = 5
        kCGEventLeftMouseDragged = 6
        kCGEventRightMouseDragged = 7
        kCGScrollEventUnitPixel = 0

        # Modifier Flags
        kCGEventFlagMaskCommand = 0x00100000
        kCGEventFlagMaskShift = 0x00020000
        kCGEventFlagMaskControl = 0x00040000
        kCGEventFlagMaskAlternate = 0x00080000

        # Mac Virtual Keycodes
        KEY_TAB = 48
        KEY_SPACE = 49
        KEY_RETURN = 36
        KEY_ESCAPE = 53
        KEY_LEFT = 123
        KEY_RIGHT = 124
        KEY_DOWN = 125
        KEY_UP = 126

        def _mac_get_mouse_pos() -> Tuple[float, float]:
            ev = cg.CGEventCreate(None)
            if not ev:
                return (500.0, 500.0)
            pt = cg.CGEventGetLocation(ev)
            return (float(pt.x), float(pt.y))

        def _mac_move_to(x: float, y: float):
            pt = CGPoint(x, y)
            ev = cg.CGEventCreateMouseEvent(None, kCGEventMouseMoved, pt, 0)
            if ev:
                cg.CGEventPost(kCGHIDEventTap, ev)

        def _mac_click(button: str = "left"):
            x, y = _mac_get_mouse_pos()
            pt = CGPoint(x, y)
            if button == "right":
                down = cg.CGEventCreateMouseEvent(None, kCGEventRightMouseDown, pt, 2)
                up = cg.CGEventCreateMouseEvent(None, kCGEventRightMouseUp, pt, 2)
            else:
                down = cg.CGEventCreateMouseEvent(None, kCGEventLeftMouseDown, pt, 1)
                up = cg.CGEventCreateMouseEvent(None, kCGEventLeftMouseUp, pt, 1)
            
            if down and up:
                cg.CGEventPost(kCGHIDEventTap, down)
                time.sleep(0.015)
                cg.CGEventPost(kCGHIDEventTap, up)

        def _mac_double_click():
            x, y = _mac_get_mouse_pos()
            pt = CGPoint(x, y)
            for _ in range(2):
                down = cg.CGEventCreateMouseEvent(None, kCGEventLeftMouseDown, pt, 1)
                up = cg.CGEventCreateMouseEvent(None, kCGEventLeftMouseUp, pt, 1)
                if down and up:
                    cg.CGEventPost(kCGHIDEventTap, down)
                    time.sleep(0.01)
                    cg.CGEventPost(kCGHIDEventTap, up)
                    time.sleep(0.03)

        def _mac_scroll(delta_x: int, delta_y: int):
            ev = cg.CGEventCreateScrollWheelEvent(None, kCGScrollEventUnitPixel, 2, int(delta_y), int(delta_x))
            if ev:
                cg.CGEventPost(kCGHIDEventTap, ev)

        def _mac_key_stroke(keycode: int, flags: int = 0):
            down = cg.CGEventCreateKeyboardEvent(None, keycode, True)
            up = cg.CGEventCreateKeyboardEvent(None, keycode, False)
            if flags and down and up:
                cg.CGEventSetFlags(down, flags)
                cg.CGEventSetFlags(up, flags)
            if down and up:
                cg.CGEventPost(kCGHIDEventTap, down)
                time.sleep(0.02)
                cg.CGEventPost(kCGHIDEventTap, up)

        AVAILABLE = True
    except Exception as e:
        print(f"[NativeCopy] macOS CoreGraphics init error: {e}")
        AVAILABLE = False

# ----------------- Windows Implementation (user32) -----------------
elif OS_NAME == "Windows":
    try:
        user32 = ctypes.windll.user32

        class POINT(ctypes.Structure):
            _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]

        MOUSEEVENTF_MOVE = 0x0001
        MOUSEEVENTF_LEFTDOWN = 0x0002
        MOUSEEVENTF_LEFTUP = 0x0004
        MOUSEEVENTF_RIGHTDOWN = 0x0008
        MOUSEEVENTF_RIGHTUP = 0x0010
        MOUSEEVENTF_WHEEL = 0x0800
        MOUSEEVENTF_HWHEEL = 0x01000

        VK_TAB = 0x09
        VK_MENU = 0x12 # Alt
        VK_SPACE = 0x20
        VK_RETURN = 0x0D
        VK_ESCAPE = 0x1B
        VK_LEFT = 0x25
        VK_RIGHT = 0x27

        def _win_get_mouse_pos() -> Tuple[float, float]:
            pt = POINT()
            user32.GetCursorPos(ctypes.byref(pt))
            return (float(pt.x), float(pt.y))

        def _win_move_to(x: float, y: float):
            user32.SetCursorPos(int(x), int(y))

        def _win_click(button: str = "left"):
            if button == "right":
                user32.mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
                time.sleep(0.015)
                user32.mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)
            else:
                user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                time.sleep(0.015)
                user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)

        def _win_double_click():
            for _ in range(2):
                user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                time.sleep(0.01)
                user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
                time.sleep(0.03)

        def _win_scroll(delta_x: int, delta_y: int):
            if delta_y != 0:
                user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, int(delta_y * 10), 0)
            if delta_x != 0:
                user32.mouse_event(MOUSEEVENTF_HWHEEL, 0, 0, int(delta_x * 10), 0)

        def _win_key_stroke(vk_code: int, with_alt: bool = False):
            if with_alt:
                user32.keybd_event(VK_MENU, 0, 0, 0)
                time.sleep(0.01)
            user32.keybd_event(vk_code, 0, 0, 0)
            time.sleep(0.02)
            user32.keybd_event(vk_code, 0, 2, 0) # 2 = KEYEVENTF_KEYUP
            if with_alt:
                time.sleep(0.01)
                user32.keybd_event(VK_MENU, 0, 2, 0)

        AVAILABLE = True
    except Exception as e:
        print(f"[NativeCopy] Windows user32 init error: {e}")
        AVAILABLE = False
else:
    AVAILABLE = False

# ----------------- Unified Public Controller API -----------------

def get_current_position() -> Tuple[float, float]:
    if not AVAILABLE:
        return (0.0, 0.0)
    if OS_NAME == "Darwin":
        return _mac_get_mouse_pos()
    elif OS_NAME == "Windows":
        return _win_get_mouse_pos()
    return (0.0, 0.0)

def move_pointer_relative(dx: float, dy: float, sensitivity: float = 1.0) -> Tuple[float, float]:
    if not AVAILABLE:
        return (0.0, 0.0)
    cur_x, cur_y = get_current_position()
    new_x = cur_x + (dx * sensitivity)
    new_y = cur_y + (dy * sensitivity)
    
    # Boundary clamp
    new_x = max(0.0, new_x)
    new_y = max(0.0, new_y)

    if OS_NAME == "Darwin":
        _mac_move_to(new_x, new_y)
    elif OS_NAME == "Windows":
        _win_move_to(new_x, new_y)
    return (new_x, new_y)

def move_pointer_absolute(x: float, y: float):
    if not AVAILABLE:
        return
    if OS_NAME == "Darwin":
        _mac_move_to(x, y)
    elif OS_NAME == "Windows":
        _win_move_to(x, y)

def click_pointer(button: str = "left"):
    if not AVAILABLE:
        return
    if button == "double":
        if OS_NAME == "Darwin":
            _mac_double_click()
        elif OS_NAME == "Windows":
            _win_double_click()
    else:
        if OS_NAME == "Darwin":
            _mac_click(button)
        elif OS_NAME == "Windows":
            _win_click(button)

def scroll_pointer(delta_x: int = 0, delta_y: int = 0, sensitivity: float = 1.0):
    if not AVAILABLE:
        return
    adj_x = int(delta_x * sensitivity)
    adj_y = int(delta_y * sensitivity)
    if OS_NAME == "Darwin":
        _mac_scroll(adj_x, adj_y)
    elif OS_NAME == "Windows":
        _win_scroll(adj_x, adj_y)

def trigger_system_gesture(action: str) -> bool:
    if not AVAILABLE:
        return False
    
    action = action.lower().strip()
    
    if OS_NAME == "Darwin":
        if action in ("switch_window", "alt_tab", "cmd_tab"):
            _mac_key_stroke(KEY_TAB, kCGEventFlagMaskCommand)
            return True
        elif action in ("next_tab", "tab_next"):
            _mac_key_stroke(KEY_RIGHT, kCGEventFlagMaskCommand | kCGEventFlagMaskAlternate)
            return True
        elif action in ("prev_tab", "tab_prev"):
            _mac_key_stroke(KEY_LEFT, kCGEventFlagMaskCommand | kCGEventFlagMaskAlternate)
            return True
        elif action in ("space", "play_pause"):
            _mac_key_stroke(KEY_SPACE)
            return True
        elif action in ("enter", "return"):
            _mac_key_stroke(KEY_RETURN)
            return True
        elif action in ("escape", "esc"):
            _mac_key_stroke(KEY_ESCAPE)
            return True
            
    elif OS_NAME == "Windows":
        if action in ("switch_window", "alt_tab", "cmd_tab"):
            _win_key_stroke(VK_TAB, with_alt=True)
            return True
        elif action in ("space", "play_pause"):
            _win_key_stroke(VK_SPACE)
            return True
        elif action in ("enter", "return"):
            _win_key_stroke(VK_RETURN)
            return True
        elif action in ("escape", "esc"):
            _win_key_stroke(VK_ESCAPE)
            return True

    return False

def get_status() -> Dict[str, Any]:
    pos = get_current_position()
    return {
        "available": AVAILABLE,
        "platform": OS_NAME,
        "x": pos[0],
        "y": pos[1]
    }
