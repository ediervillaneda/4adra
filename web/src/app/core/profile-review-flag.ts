import { Injectable } from '@angular/core';

const STORAGE_KEY = '4adra.profileReviewed';

/**
 * Marca local "ya revisé mi perfil" para ocultar el aviso de Inicio. Es solo una comodidad:
 * si el almacenamiento no está disponible, el aviso simplemente vuelve a aparecer.
 */
@Injectable({ providedIn: 'root' })
export class ProfileReviewFlag {
  isReviewed(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  markReviewed(): void {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Sin almacenamiento: el aviso seguirá apareciendo; no es un error para el usuario.
    }
  }
}
