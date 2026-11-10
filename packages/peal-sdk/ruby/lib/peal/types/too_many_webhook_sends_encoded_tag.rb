# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module TooManyWebhookSendsEncodedTag
      extend Peal::Internal::Types::Enum

      TOO_MANY_WEBHOOK_SENDS = "TooManyWebhookSends"
    end
  end
end
