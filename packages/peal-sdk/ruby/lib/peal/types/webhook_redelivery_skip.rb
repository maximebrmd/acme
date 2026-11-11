# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module WebhookRedeliverySkip
      extend Peal::Internal::Types::Enum

      ALREADY_SENT = "alreadySent"
      ENDPOINT_DISABLED = "endpointDisabled"
      NOT_FOUND = "notFound"
    end
  end
end
