import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  StatusReservaAreaComum,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateReservaAreaComumDto } from './dto/create-reserva-area-comum.dto';
import { RecusarReservaDto } from './dto/recusar-reserva.dto';

@Injectable()
export class ReservasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    condominioId: number,
    dto: CreateReservaAreaComumDto,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    const area = await this.prisma.areaComum.findFirst({
      where: {
        id: dto.areaComumId,
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
        exigeAprovacao: true,
        permiteReserva: true,
      },
    });

    if (!area) {
      throw new NotFoundException('Área comum não encontrada.');
    }

    if (!area.permiteReserva) {
      throw new BadRequestException(
        'Esta área comum não está liberada para reservas.',
      );
    }

    if (dto.unidadeId) {
      await this.garantirUnidade(condominioId, dto.unidadeId);
    }

    if (dto.moradorId) {
      await this.garantirMorador(condominioId, dto.moradorId);
    }

    if (dto.unidadeId && dto.moradorId) {
      await this.garantirVinculoMoradorUnidade(
        dto.moradorId,
        dto.unidadeId,
      );
    }

    const inicioEm = new Date(dto.inicioEm);
    const fimEm = new Date(dto.fimEm);

    if (fimEm <= inicioEm) {
      throw new BadRequestException(
        'A data final deve ser posterior à data inicial.',
      );
    }

    await this.garantirSemConflito(
      condominioId,
      dto.areaComumId,
      inicioEm,
      fimEm,
    );

    const statusInicial = area.exigeAprovacao
      ? StatusReservaAreaComum.SOLICITADA
      : StatusReservaAreaComum.APROVADA;

    return this.prisma.reservaAreaComum.create({
      data: {
        condominioId,
        areaComumId: dto.areaComumId,
        unidadeId: dto.unidadeId ?? null,
        moradorId: dto.moradorId ?? null,
        criadoPorUsuarioId: usuario.id,
        titulo: this.normalizarOpcional(dto.titulo),
        inicioEm,
        fimEm,
        status: statusInicial,
        aprovadoPorUsuarioId: area.exigeAprovacao ? null : usuario.id,
        aprovadoEm: area.exigeAprovacao ? null : new Date(),
        observacoes: this.normalizarOpcional(dto.observacoes),
      },
      include: this.includeResumoReserva(),
    });
  }

  async findAll(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.reservaAreaComum.findMany({
      where: {
        condominioId,
      },
      include: this.includeResumoReserva(),
      orderBy: {
        inicioEm: 'desc',
      },
    });
  }

  async findOne(condominioId: number, reservaId: number) {
    const reserva = await this.prisma.reservaAreaComum.findFirst({
      where: {
        id: reservaId,
        condominioId,
      },
      include: {
        areaComum: true,
        unidade: true,
        morador: true,
        criadoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
        aprovadoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    return reserva;
  }

  async aprovar(
    condominioId: number,
    reservaId: number,
    usuario: AuthenticatedUser,
  ) {
    const reserva = await this.prisma.reservaAreaComum.findFirst({
      where: {
        id: reservaId,
        condominioId,
      },
      select: {
        id: true,
        areaComumId: true,
        inicioEm: true,
        fimEm: true,
        status: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    if (reserva.status !== StatusReservaAreaComum.SOLICITADA) {
      throw new BadRequestException(
        'Apenas reservas solicitadas podem ser aprovadas.',
      );
    }

    await this.garantirSemConflito(
      condominioId,
      reserva.areaComumId,
      reserva.inicioEm,
      reserva.fimEm,
      reserva.id,
    );

    return this.prisma.reservaAreaComum.update({
      where: {
        id: reserva.id,
      },
      data: {
        status: StatusReservaAreaComum.APROVADA,
        aprovadoPorUsuarioId: usuario.id,
        aprovadoEm: new Date(),
      },
    });
  }

  async recusar(
    condominioId: number,
    reservaId: number,
    dto: RecusarReservaDto,
  ) {
    const reserva = await this.prisma.reservaAreaComum.findFirst({
      where: {
        id: reservaId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    if (reserva.status !== StatusReservaAreaComum.SOLICITADA) {
      throw new BadRequestException(
        'Apenas reservas solicitadas podem ser recusadas.',
      );
    }

    return this.prisma.reservaAreaComum.update({
      where: {
        id: reserva.id,
      },
      data: {
        status: StatusReservaAreaComum.RECUSADA,
        recusadoEm: new Date(),
        motivoRecusa: dto.motivoRecusa.trim(),
      },
    });
  }

  async concluir(condominioId: number, reservaId: number) {
    const reserva = await this.prisma.reservaAreaComum.findFirst({
      where: {
        id: reservaId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
        fimEm: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    if (reserva.status !== StatusReservaAreaComum.APROVADA) {
      throw new BadRequestException(
        'Apenas reservas aprovadas podem ser concluídas.',
      );
    }

    if (reserva.fimEm > new Date()) {
      throw new BadRequestException(
        'A reserva só pode ser concluída após o horário final.',
      );
    }

    return this.prisma.reservaAreaComum.update({
      where: {
        id: reserva.id,
      },
      data: {
        status: StatusReservaAreaComum.CONCLUIDA,
        concluidoEm: new Date(),
      },
      include: this.includeResumoReserva(),
    });
  }

  async cancelar(condominioId: number, reservaId: number) {
    const reserva = await this.prisma.reservaAreaComum.findFirst({
      where: {
        id: reservaId,
        condominioId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada.');
    }

    if (
      reserva.status === StatusReservaAreaComum.CANCELADA ||
      reserva.status === StatusReservaAreaComum.RECUSADA ||
      reserva.status === StatusReservaAreaComum.CONCLUIDA
    ) {
      throw new BadRequestException(
        'Esta reserva não pode mais ser cancelada.',
      );
    }

    return this.prisma.reservaAreaComum.update({
      where: {
        id: reserva.id,
      },
      data: {
        status: StatusReservaAreaComum.CANCELADA,
        canceladoEm: new Date(),
      },
    });
  }

  async cancelarPortal(
    condominioId: number,
    reservaId: number,
    usuario: AuthenticatedUser,
  ) {
    const morador = await this.prisma.morador.findFirst({
      where: {
        condominioId,
        usuarioId: usuario.id,
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    if (!morador) {
      throw new BadRequestException(
        'Não foi possível localizar o morador vinculado ao usuário logado.',
      );
    }

    const reserva = await this.prisma.reservaAreaComum.findFirst({
      where: {
        id: reservaId,
        condominioId,
        moradorId: morador.id,
      },
      select: {
        id: true,
        status: true,
        inicioEm: true,
      },
    });

    if (!reserva) {
      throw new NotFoundException('Reserva não encontrada para este morador.');
    }

    if (reserva.status !== StatusReservaAreaComum.SOLICITADA) {
      throw new BadRequestException(
        'Apenas solicitações pendentes podem ser canceladas pelo morador.',
      );
    }

    if (reserva.inicioEm <= new Date()) {
      throw new BadRequestException(
        'Esta solicitação não pode mais ser cancelada pelo portal.',
      );
    }

    return this.prisma.reservaAreaComum.update({
      where: {
        id: reserva.id,
      },
      data: {
        status: StatusReservaAreaComum.CANCELADA,
        canceladoEm: new Date(),
      },
      include: this.includeResumoReserva(),
    });
  }


  async verificarDisponibilidade(
    condominioId: number,
    areaComumId: number,
    inicioEm: string,
    fimEm: string,
  ) {
    await this.garantirCondominio(condominioId);

    const area = await this.prisma.areaComum.findFirst({
      where: {
        id: areaComumId,
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        permiteReserva: true,
      },
    });

    if (!area) {
      throw new NotFoundException('Área comum não encontrada.');
    }

    const inicio = new Date(inicioEm);
    const fim = new Date(fimEm);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      throw new BadRequestException(
        'Informe datas válidas para consultar a disponibilidade.',
      );
    }

    if (fim <= inicio) {
      throw new BadRequestException(
        'O horário final deve ser posterior ao horário inicial.',
      );
    }

    const conflitos = await this.buscarConflitos(
      condominioId,
      areaComumId,
      inicio,
      fim,
    );

    return {
      areaComum: area,
      inicioEm: inicio,
      fimEm: fim,
      disponivel: area.permiteReserva && conflitos.length === 0,
      conflitos,
    };
  }

  async agenda(
    condominioId: number,
    inicioEm?: string,
    fimEm?: string,
  ) {
    await this.garantirCondominio(condominioId);

    const inicio = inicioEm ? new Date(inicioEm) : null;
    const fim = fimEm ? new Date(fimEm) : null;

    if (
      (inicio && Number.isNaN(inicio.getTime())) ||
      (fim && Number.isNaN(fim.getTime()))
    ) {
      throw new BadRequestException('Período inválido para consulta da agenda.');
    }

    return this.prisma.reservaAreaComum.findMany({
      where: {
        condominioId,
        status: {
          in: [
            StatusReservaAreaComum.SOLICITADA,
            StatusReservaAreaComum.APROVADA,
          ],
        },
        inicioEm: fim ? { lt: fim } : undefined,
        fimEm: inicio ? { gt: inicio } : undefined,
      },
      include: this.includeResumoReserva(),
      orderBy: [
        {
          inicioEm: 'asc',
        },
        {
          areaComumId: 'asc',
        },
      ],
    });
  }

  private includeResumoReserva() {
    return {
      areaComum: {
        select: {
          id: true,
          nome: true,
        },
      },
      unidade: {
        select: {
          id: true,
          identificador: true,
        },
      },
      morador: {
        select: {
          id: true,
          nome: true,
        },
      },
    };
  }

  private async buscarConflitos(
    condominioId: number,
    areaComumId: number,
    inicioEm: Date,
    fimEm: Date,
    ignorarReservaId?: number,
  ) {
    return this.prisma.reservaAreaComum.findMany({
      where: {
        condominioId,
        areaComumId,
        id: ignorarReservaId ? { not: ignorarReservaId } : undefined,
        status: {
          in: [
            StatusReservaAreaComum.SOLICITADA,
            StatusReservaAreaComum.APROVADA,
          ],
        },
        inicioEm: {
          lt: fimEm,
        },
        fimEm: {
          gt: inicioEm,
        },
      },
      include: this.includeResumoReserva(),
      orderBy: {
        inicioEm: 'asc',
      },
    });
  }

  private async garantirSemConflito(
    condominioId: number,
    areaComumId: number,
    inicioEm: Date,
    fimEm: Date,
    ignorarReservaId?: number,
  ): Promise<void> {
    const conflitos = await this.buscarConflitos(
      condominioId,
      areaComumId,
      inicioEm,
      fimEm,
      ignorarReservaId,
    );

    if (conflitos.length > 0) {
      throw new ConflictException(
        'Já existe reserva ou solicitação para esta área no período informado.',
      );
    }
  }

  private async garantirCondominio(condominioId: number): Promise<void> {
    const condominio = await this.prisma.condominio.findUnique({
      where: {
        id: condominioId,
      },
      select: {
        id: true,
      },
    });

    if (!condominio) {
      throw new NotFoundException('Condomínio não encontrado.');
    }
  }

  private async garantirUnidade(
    condominioId: number,
    unidadeId: number,
  ): Promise<void> {
    const unidade = await this.prisma.unidade.findFirst({
      where: {
        id: unidadeId,
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada.');
    }
  }

  private async garantirMorador(
    condominioId: number,
    moradorId: number,
  ): Promise<void> {
    const morador = await this.prisma.morador.findFirst({
      where: {
        id: moradorId,
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    if (!morador) {
      throw new NotFoundException('Morador não encontrado.');
    }
  }

  private async garantirVinculoMoradorUnidade(
    moradorId: number,
    unidadeId: number,
  ): Promise<void> {
    const vinculo = await this.prisma.moradorUnidade.findFirst({
      where: {
        moradorId,
        unidadeId,
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    if (!vinculo) {
      throw new BadRequestException(
        'O morador informado não está vinculado à unidade informada.',
      );
    }
  }

  private normalizarOpcional(valor?: string): string | null {
    const normalizado = valor?.trim();
    return normalizado ? normalizado : null;
  }
}
