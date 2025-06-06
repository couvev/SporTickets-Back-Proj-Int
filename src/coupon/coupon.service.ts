import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventService } from 'src/event/event.service';
import { CouponRepository } from './coupon.repository';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { UpdateCouponsListDto } from './dto/update-coupons-list';
import { UseCouponDto } from './dto/use-coupon.dto';

@Injectable()
export class CouponService {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly eventService: EventService,
  ) {}

  async createCoupon(data: CreateCouponDto) {
    if (data.percentage < 0 || data.percentage > 1) {
      throw new BadRequestException('Percentage must be between 0 and 1');
    }

    const existingCoupon = await this.couponRepository.findCouponByNameAndEvent(
      data.name,
      data.eventId,
    );
    if (existingCoupon) {
      throw new ConflictException('Coupon name already exists for this event');
    }

    const userExists = await this.couponRepository.findUserById(data.createdBy);
    if (!userExists) {
      throw new NotFoundException('User not found');
    }

    return this.couponRepository.create(data);
  }

  async updateCoupon(id: string, data: UpdateCouponDto) {
    return this.couponRepository.update(id, data);
  }

  async deleteCoupon(id: string) {
    return this.couponRepository.softDelete(id);
  }

  async validateCoupon({ name, eventId }: UseCouponDto) {
    const coupon = await this.couponRepository.findValidCoupon(name, eventId);
    if (!coupon) {
      throw new NotFoundException('Invalid or expired coupon');
    }

    return {
      id: coupon.id,
      name: coupon.name,
      percentage: coupon.percentage,
    };
  }

  async getCouponsByEvent(eventId: string) {
    return this.couponRepository.findAllByEvent(eventId);
  }

  async updateCouponsList(
    userId: string,
    eventId: string,
    coupons: UpdateCouponsListDto[],
  ) {
    const hasPermission = await this.eventService.userHasEventPermission(
      userId,
      eventId,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to update this event',
      );
    }

    const couponNames = coupons.map((coupon) => coupon.name);
    const uniqueNames = new Set(couponNames);

    if (couponNames.length !== uniqueNames.size) {
      throw new ConflictException('Duplicate coupon names are not allowed');
    }

    for (const coupon of coupons) {
      const existingCoupon =
        await this.couponRepository.findCouponByNameAndEvent(
          coupon.name,
          eventId,
        );
      if (existingCoupon && existingCoupon.id !== coupon.id) {
        throw new ConflictException(
          `Coupon name "${coupon.name}" already exists for this event`,
        );
      }
    }

    return this.couponRepository.updateCouponsList(userId, eventId, coupons);
  }
}
