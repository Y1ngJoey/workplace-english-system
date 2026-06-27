"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ThreeModule = typeof import("three");

function createTexture(THREE: ThreeModule) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#FFFFFF");
  gradient.addColorStop(0.55, "#F4FCFB");
  gradient.addColorStop(1, "#EAF8F5");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(207, 230, 216, 0.46)";
  context.strokeStyle = "rgba(188, 218, 199, 0.5)";
  context.lineWidth = 2;
  const blob = (cx: number, cy: number, rx: number, ry: number) => {
    context.beginPath();
    context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  };

  blob(225, 150, 92, 72);
  blob(300, 330, 55, 82);
  blob(520, 150, 58, 46);
  blob(560, 300, 72, 92);
  blob(770, 160, 150, 92);
  blob(885, 360, 55, 34);

  return new THREE.CanvasTexture(canvas);
}

function latLng(THREE: ThreeModule, radius: number, lat: number, lng: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export function TravelGlobe({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    async function init() {
      const mount = mountRef.current;
      if (!mount) return;

      try {
        const THREE = await import("three");
        if (cancelled || !mountRef.current) return;

        const texture = createTexture(THREE);
        if (!texture) {
          setFallback(true);
          return;
        }

        let width = mount.clientWidth;
        let height = mount.clientHeight;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
        camera.position.z = 2.55;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        mount.appendChild(renderer.domElement);

        const globe = new THREE.Group();
        scene.add(globe);
        globe.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(1, 64, 48),
            new THREE.MeshBasicMaterial({ map: texture }),
          ),
        );
        scene.add(
          new THREE.Mesh(
            new THREE.SphereGeometry(1.05, 48, 32),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, side: THREE.BackSide }),
          ),
        );

        [
          { lat: 48.85, lng: 2.35, color: 0xcc6e96 },
          { lat: 35, lng: 135.77, color: 0x5c9f80 },
          { lat: 18.79, lng: 98.99, color: 0x8e63b8 },
        ].forEach((pin) => {
          const base = latLng(THREE, 1, pin.lat, pin.lng);
          const tip = latLng(THREE, 1.13, pin.lat, pin.lng);
          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.032, 16, 16),
            new THREE.MeshBasicMaterial({ color: pin.color }),
          );
          dot.position.copy(tip);
          globe.add(dot);
          globe.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints([base, tip]),
              new THREE.LineBasicMaterial({ color: pin.color }),
            ),
          );
        });

        scene.add(new THREE.AmbientLight(0xffffff, 0.92));
        const directional = new THREE.DirectionalLight(0xffffff, 0.42);
        directional.position.set(4, 2.5, 5);
        scene.add(directional);

        globe.rotation.y = -2.1;
        globe.rotation.x = 0.3;

        let dragging = false;
        let startX = 0;
        let startY = 0;
        let rotationY = 0;
        let rotationX = 0;
        let auto = true;
        let resumeTimer: number | undefined;
        let frame = 0;

        const canvas = renderer.domElement;
        const onPointerDown = (event: PointerEvent) => {
          dragging = true;
          auto = false;
          window.clearTimeout(resumeTimer);
          startX = event.clientX;
          startY = event.clientY;
          rotationY = globe.rotation.y;
          rotationX = globe.rotation.x;
          canvas.setPointerCapture(event.pointerId);
          mount.classList.add("cursor-grabbing");
        };
        const onPointerMove = (event: PointerEvent) => {
          if (!dragging) return;
          globe.rotation.y = rotationY + (event.clientX - startX) * 0.01;
          globe.rotation.x = Math.max(-1.1, Math.min(1.1, rotationX + (event.clientY - startY) * 0.01));
        };
        const onPointerEnd = () => {
          dragging = false;
          mount.classList.remove("cursor-grabbing");
          window.clearTimeout(resumeTimer);
          resumeTimer = window.setTimeout(() => {
            auto = true;
          }, 1800);
        };
        const onResize = () => {
          if (!mountRef.current) return;
          width = mountRef.current.clientWidth;
          height = mountRef.current.clientHeight;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };
        const render = () => {
          frame = window.requestAnimationFrame(render);
          if (auto) globe.rotation.y += 0.0016;
          renderer.render(scene, camera);
        };

        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerEnd);
        canvas.addEventListener("pointercancel", onPointerEnd);
        window.addEventListener("resize", onResize);
        render();

        cleanup = () => {
          window.cancelAnimationFrame(frame);
          window.clearTimeout(resumeTimer);
          window.removeEventListener("resize", onResize);
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", onPointerEnd);
          canvas.removeEventListener("pointercancel", onPointerEnd);
          renderer.dispose();
          texture.dispose();
          mount.replaceChildren();
        };
      } catch {
        setFallback(true);
      }
    }

    void init();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <div className={cn("relative mx-auto h-[256px] max-h-[70vw] w-[256px] max-w-[70vw] lg:mx-0", className)}>
      <div className="absolute inset-[-14%] rounded-full bg-[radial-gradient(circle_at_50%_44%,rgba(168,216,192,0.4),rgba(144,189,223,0.16)_58%,rgba(195,164,221,0.06)_74%,transparent_80%)] blur-[3px]" />
      <div className="absolute inset-[8%] rounded-full border border-dashed border-mint-line" />
      <div className="absolute inset-[1%] rotate-[-18deg] rounded-full border border-dashed border-pink-line" />
      <div
        ref={mountRef}
        className="relative h-full w-full cursor-grab overflow-hidden rounded-full"
        aria-label="可拖拽旋转的旅行星球"
      >
        {fallback ? (
          <div className="grid h-full w-full place-items-center rounded-full border border-mint-line bg-gradient-to-br from-blue-soft via-white to-mint-soft text-center text-sm font-extrabold text-mint-deep shadow-milk">
            <span>旅行星球<br />正在等网络变好</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
