# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FollowUpStatus
      extend Peal::Internal::Types::Enum

      ARMED = "armed"
      WAITING = "waiting"
      SENDING = "sending"
      SENT = "sent"
      FAILED = "failed"
      UNCONFIRMED = "unconfirmed"
      EXPIRED = "expired"
      CANCELLED = "cancelled"
    end
  end
end
