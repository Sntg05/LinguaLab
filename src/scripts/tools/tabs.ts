/**
 * Navegación por teclado de un grupo de pestañas, según el patrón de pestañas de
 * WAI-ARIA Authoring Practices: las flechas recorren el grupo con vuelta, Inicio
 * y Fin van a los extremos, y el foco se mueve con la selección (activación
 * automática, porque cambiar de pestaña aquí solo vuelve a dibujar un panel).
 *
 * Es una función pura para poder probarla sin navegador: devuelve la posición
 * nueva, o `null` cuando la tecla no es de navegación y el evento no se toca.
 */
export const nextTabIndex = (current: number, count: number, key: string): number | null => {
  if (count <= 0) return null;
  switch (key) {
    case "ArrowRight":
      return (current + 1) % count;
    case "ArrowLeft":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
};
