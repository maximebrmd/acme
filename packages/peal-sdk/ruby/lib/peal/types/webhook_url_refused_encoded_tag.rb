# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module WebhookURLRefusedEncodedTag
      extend Peal::Internal::Types::Enum

      WEBHOOK_URL_REFUSED = "WebhookUrlRefused"
    end
  end
end
