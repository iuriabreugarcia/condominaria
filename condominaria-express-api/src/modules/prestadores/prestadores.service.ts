import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StatusAutorizacaoPrestador,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateAutorizacaoPrestadorDto } from './dto/create-autorizacao-prestador.dto';
import { CreatePrestadorDto } from './dto/create-prestador.dto';
import { UpdatePrestadorDto } from './dto/update-prestador.dto';
import { RegistrarEntradaPrestadorDto } from './dto/registrar-entrada-prestador.dto';
import { RegistrarSaidaPrestadorDto } from './dto/registrar-saida-prestador.dto';

@Injectable()
export class PrestadoresService {
  constructor(private readonly prisma: PrismaService) {}

  async criarPrestador(
    condominioId: number,
    dto: CreatePrestadorDto,
  ) {
    await this.garantirCondominio(condominioId);

    try {
      return await this.prisma.prestadorServico.create({
        data: {
          condominioId,
          nome: dto.nome.trim(),
          empresa: this.normalizarOpcional(dto.empresa),
          tipoServico: this.normalizarOpcional(dto.tipoServico),
          tipoDocumento: dto.tipoDocumento ?? null,
          documento: this.normalizarOpcional(dto.documento),
          telefone: this.normalizarOpcional(dto.telefone),
          observacoes: this.normalizarOpcional(dto.observacoes),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um prestador com esse documento neste condomínio.',
        );
      }

      throw error;
    }
  }

  async listarPrestadores(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.prestadorServico.findMany({
      where: {
        condominioId,
      },
      orderBy: {
        nome: 'asc',
      },
    });
  }


  async atualizarPrestador(
    condominioId: number,
    prestadorId: number,
    dto: UpdatePrestadorDto,
  ) {
    await this.garantirCondominio(condominioId);

    const prestador = await this.prisma.prestadorServico.findFirst({
      where: {
        id: prestadorId,
        condominioId,
      },
      select: {
        id: true,
      },
    });

    if (!prestador) {
      throw new NotFoundException('Prestador não encontrado.');
    }

    const data: Prisma.PrestadorServicoUpdateInput = {};

    if (dto.nome !== undefined) {
      data.nome = dto.nome.trim();
    }

    if (dto.empresa !== undefined) {
      data.empresa = this.normalizarOpcional(dto.empresa);
    }

    if (dto.tipoServico !== undefined) {
      data.tipoServico = this.normalizarOpcional(dto.tipoServico);
    }

    if (dto.tipoDocumento !== undefined) {
      data.tipoDocumento = dto.tipoDocumento ?? null;
    }

    if (dto.documento !== undefined) {
      data.documento = this.normalizarOpcional(dto.documento);
    }

    if (dto.telefone !== undefined) {
      data.telefone = this.normalizarOpcional(dto.telefone);
    }

    if (dto.observacoes !== undefined) {
      data.observacoes = this.normalizarOpcional(dto.observacoes);
    }

    try {
      return await this.prisma.prestadorServico.update({
        where: {
          id: prestador.id,
        },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um prestador com esse documento neste condomínio.',
        );
      }

      throw error;
    }
  }

  async alterarStatusPrestador(
    condominioId: number,
    prestadorId: number,
    dto: { ativo?: boolean },
  ) {
    await this.garantirCondominio(condominioId);

    if (typeof dto.ativo !== 'boolean') {
      throw new BadRequestException('Informe se o prestador deve ficar ativo.');
    }

    const prestador = await this.prisma.prestadorServico.findFirst({
      where: {
        id: prestadorId,
        condominioId,
      },
      select: {
        id: true,
      },
    });

    if (!prestador) {
      throw new NotFoundException('Prestador não encontrado.');
    }

    return this.prisma.prestadorServico.update({
      where: {
        id: prestador.id,
      },
      data: {
        ativo: dto.ativo,
      },
    });
  }

  async buscarPrestador(condominioId: number, prestadorId: number) {
    const prestador = await this.prisma.prestadorServico.findFirst({
      where: {
        id: prestadorId,
        condominioId,
      },
      include: {
        autorizacoes: {
          orderBy: {
            criadoEm: 'desc',
          },
          take: 10,
          include: {
            unidade: {
              select: {
                id: true,
                identificador: true,
                numero: true,
              },
            },
            morador: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    });

    if (!prestador) {
      throw new NotFoundException('Prestador não encontrado.');
    }

    return prestador;
  }

  async criarAutorizacao(
    condominioId: number,
    dto: CreateAutorizacaoPrestadorDto,
    usuario: AuthenticatedUser,
  ) {
    await this.garantirCondominio(condominioId);

    const prestador = await this.prisma.prestadorServico.findFirst({
      where: {
        id: dto.prestadorId,
        condominioId,
        ativo: true,
      },
      select: {
        id: true,
      },
    });

    if (!prestador) {
      throw new NotFoundException('Prestador não encontrado.');
    }

    if (dto.unidadeId) {
      await this.garantirUnidade(condominioId, dto.unidadeId);
    }

    if (dto.moradorId) {
      if (!dto.unidadeId) {
        throw new BadRequestException(
          'Informe a unidade ao vincular a autorização a um morador.',
        );
      }

      await this.garantirMorador(condominioId, dto.moradorId);
      await this.garantirVinculoMoradorUnidade(
        dto.moradorId,
        dto.unidadeId,
      );
    }

    const inicioEm = new Date(dto.inicioEm);
    const fimEm = new Date(dto.fimEm);

    if (fimEm <= inicioEm) {
      throw new BadRequestException(
        'A data final da autorização deve ser posterior à data inicial.',
      );
    }

    return this.prisma.autorizacaoPrestador.create({
      data: {
        condominioId,
        prestadorId: dto.prestadorId,
        unidadeId: dto.unidadeId ?? null,
        moradorId: dto.moradorId ?? null,
        criadoPorUsuarioId: usuario.id,
        inicioEm,
        fimEm,
        observacoes: this.normalizarOpcional(dto.observacoes),
      },
      include: {
        prestador: {
          select: {
            id: true,
            nome: true,
            empresa: true,
            tipoServico: true,
            documento: true,
            telefone: true,
          },
        },
        unidade: {
          select: {
            id: true,
            identificador: true,
            numero: true,
          },
        },
        morador: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });
  }

  async listarAutorizacoesAtivas(condominioId: number) {
    await this.garantirCondominio(condominioId);

    const agora = new Date();

    return this.prisma.autorizacaoPrestador.findMany({
      where: {
        condominioId,
        status: StatusAutorizacaoPrestador.ATIVA,
        inicioEm: {
          lte: agora,
        },
        fimEm: {
          gte: agora,
        },
      },
      include: {
        prestador: {
          select: {
            id: true,
            nome: true,
            empresa: true,
            tipoServico: true,
            documento: true,
            telefone: true,
          },
        },
        unidade: {
          select: {
            id: true,
            identificador: true,
            numero: true,
          },
        },
        morador: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: {
        fimEm: 'asc',
      },
    });
  }

  async registrarEntrada(
    condominioId: number,
    autorizacaoId: number,
    dto: RegistrarEntradaPrestadorDto,
    usuario: AuthenticatedUser,
  ) {
    const autorizacao = await this.prisma.autorizacaoPrestador.findFirst({
      where: {
        id: autorizacaoId,
        condominioId,
        status: StatusAutorizacaoPrestador.ATIVA,
      },
      select: {
        id: true,
        prestadorId: true,
        unidadeId: true,
        inicioEm: true,
        fimEm: true,
      },
    });

    if (!autorizacao) {
      throw new NotFoundException('Autorização de prestador não encontrada.');
    }

    const agora = new Date();

    if (agora < autorizacao.inicioEm || agora > autorizacao.fimEm) {
      throw new BadRequestException(
        'Esta autorização não está válida para o horário atual.',
      );
    }

    const acessoAberto = await this.prisma.registroAcessoPrestador.findFirst({
      where: {
        autorizacaoPrestadorId: autorizacao.id,
        saidaEm: null,
      },
      select: {
        id: true,
      },
    });

    if (acessoAberto) {
      throw new ConflictException(
        'Já existe uma entrada em aberto para esta autorização.',
      );
    }

    return this.prisma.registroAcessoPrestador.create({
      data: {
        condominioId,
        autorizacaoPrestadorId: autorizacao.id,
        prestadorId: autorizacao.prestadorId,
        unidadeId: autorizacao.unidadeId ?? null,
        entradaRegistradaPorId: usuario.id,
        observacoesEntrada: this.normalizarOpcional(dto.observacoesEntrada),
      },
      include: {
        prestador: {
          select: {
            id: true,
            nome: true,
            empresa: true,
            tipoServico: true,
          },
        },
        unidade: {
          select: {
            id: true,
            identificador: true,
          },
        },
      },
    });
  }

  async listarAcessosEmAberto(condominioId: number) {
    await this.garantirCondominio(condominioId);

    return this.prisma.registroAcessoPrestador.findMany({
      where: {
        condominioId,
        saidaEm: null,
      },
      include: {
        prestador: {
          select: {
            id: true,
            nome: true,
            empresa: true,
            tipoServico: true,
            documento: true,
            telefone: true,
          },
        },
        unidade: {
          select: {
            id: true,
            identificador: true,
            numero: true,
          },
        },
      },
      orderBy: {
        entradaEm: 'desc',
      },
    });
  }

  async registrarSaida(
    condominioId: number,
    registroId: number,
    dto: RegistrarSaidaPrestadorDto,
    usuario: AuthenticatedUser,
  ) {
    const registro = await this.prisma.registroAcessoPrestador.findFirst({
      where: {
        id: registroId,
        condominioId,
        saidaEm: null,
      },
      select: {
        id: true,
      },
    });

    if (!registro) {
      throw new NotFoundException(
        'Registro de acesso em aberto não encontrado.',
      );
    }

    return this.prisma.registroAcessoPrestador.update({
      where: {
        id: registro.id,
      },
      data: {
        saidaEm: new Date(),
        saidaRegistradaPorId: usuario.id,
        observacoesSaida: this.normalizarOpcional(dto.observacoesSaida),
      },
      include: {
        prestador: {
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
      },
    });
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
