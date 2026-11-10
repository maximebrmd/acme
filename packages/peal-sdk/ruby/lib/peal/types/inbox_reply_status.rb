# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module InboxReplyStatus
      extend Peal::Internal::Types::Enum

      SENDING = "sending"
      SENT = "sent"
      FAILED = "failed"
      UNCONFIRMED = "unconfirmed"
      WITHDRAWN = "withdrawn"
    end
  end
end
