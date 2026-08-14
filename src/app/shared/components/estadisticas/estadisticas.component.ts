import { Component, inject, Input, OnInit } from '@angular/core';
import { List } from 'src/app/models/list.model';
import { MonedaService } from 'src/app/services/moneda.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-estadisticas',
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss'],
  standalone: false
})
export class EstadisticasComponent implements OnInit {

  utilsSvc = inject(UtilsService);
  monedaSvc = inject(MonedaService);

  /** Solo listas vivas: la papelera y las plantillas no cuentan */
  @Input() listas: List[] = [];

  totales = { listas: 0, completas: 0, items: 0, comprados: 0 };
  frecuentes: { nombre: string, veces: number }[] = [];
  gastoMes = '';
  porSeccion: { seccion: string, veces: number, porcentaje: number }[] = [];

  ngOnInit() {
    const vivas = this.listas.filter(l => !l.deletedAt && !l.template);

    this.totales = {
      listas: vivas.length,
      completas: vivas.filter(l => l.status === 'Completo').length,
      items: vivas.reduce((n, l) => n + (l.items?.length ?? 0), 0),
      comprados: vivas.reduce((n, l) => n + (l.items?.filter(i => i.completed).length ?? 0), 0)
    };

    // Lo que más se repite entre listas distintas, no dentro de la misma
    const cuenta = new Map<string, { nombre: string, veces: number }>();
    for (const lista of vivas) {
      const vistos = new Set<string>();
      for (const item of lista.items ?? []) {
        const clave = item.name?.trim().toLowerCase();
        if (!clave || vistos.has(clave)) continue;
        vistos.add(clave);
        const previo = cuenta.get(clave);
        if (previo) previo.veces++;
        else cuenta.set(clave, { nombre: item.name.trim(), veces: 1 });
      }
    }
    this.frecuentes = [...cuenta.values()].sort((a, b) => b.veces - a.veces).slice(0, 6);

    // Gasto del mes: solo lo ya comprado, que es lo único que se gastó de verdad
    const ahora = new Date();
    const gasto = vivas
      .filter(l => {
        const f = new Date(l.dateHour);
        return !isNaN(f.getTime())
          && f.getMonth() === ahora.getMonth()
          && f.getFullYear() === ahora.getFullYear();
      })
      .reduce((suma, l) => suma + this.monedaSvc.total((l.items ?? []).filter(i => i.completed)), 0);
    this.gastoMes = this.monedaSvc.formatear(gasto);

    // Reparto por sección
    const secciones = new Map<string, number>();
    let conSeccion = 0;
    for (const lista of vivas) {
      for (const item of lista.items ?? []) {
        if (!item.category) continue;
        secciones.set(item.category, (secciones.get(item.category) ?? 0) + 1);
        conSeccion++;
      }
    }
    this.porSeccion = [...secciones.entries()]
      .map(([seccion, veces]) => ({ seccion, veces, porcentaje: Math.round(veces / conSeccion * 100) }))
      .sort((a, b) => b.veces - a.veces)
      .slice(0, 5);
  }

  get porcentajeCompletado(): number {
    return this.totales.items ? Math.round(this.totales.comprados / this.totales.items * 100) : 0;
  }

  cerrar() {
    this.utilsSvc.dismissModal();
  }
}
