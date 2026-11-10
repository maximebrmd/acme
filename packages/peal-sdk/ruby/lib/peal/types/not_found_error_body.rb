# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NotFoundErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::WebhookEndpointNotFoundEncoded }, key: "WEBHOOK_ENDPOINT_NOT_FOUND"

      member -> { Peal::Types::WebhookDeliveryNotFoundEncoded }, key: "WEBHOOK_DELIVERY_NOT_FOUND"

      member -> { Peal::Types::WorkspaceNotFoundEncoded }, key: "WORKSPACE_NOT_FOUND"
    end
  end
end
