# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PostRefusal < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::PostContentInvalidEncoded }, key: "POST_CONTENT_INVALID"

      member -> { Peal::Types::UnknownChannelsEncoded }, key: "UNKNOWN_CHANNELS"

      member -> { Peal::Types::UnknownMediaEncoded }, key: "UNKNOWN_MEDIA"

      member -> { Peal::Types::ScheduleInPastEncoded }, key: "SCHEDULE_IN_PAST"

      member -> { Peal::Types::InvalidTimeZoneEncoded }, key: "INVALID_TIME_ZONE"

      member -> { Peal::Types::PlanLimitReachedEncoded }, key: "PLAN_LIMIT_REACHED"

      member -> { Peal::Types::IdempotencyKeyReusedEncoded }, key: "IDEMPOTENCY_KEY_REUSED"

      member -> { Peal::Types::PostNotFoundEncoded }, key: "POST_NOT_FOUND"

      member -> { Peal::Types::DuplicatePostEncoded }, key: "DUPLICATE_POST"

      member -> { Peal::Types::ForbiddenEncoded }, key: "FORBIDDEN"
    end
  end
end
