# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FollowUpNotSentReason
      extend Peal::Internal::Types::Enum

      FAILED = "failed"
      UNCONFIRMED = "unconfirmed"
      WINDOW_ENDED = "windowEnded"
      NOT_GRANTED = "notGranted"
      NOT_APPROVED = "notApproved"
    end
  end
end
