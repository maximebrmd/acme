# frozen_string_literal: true

module Peal
  module Webhooks
    module Types
      class RedeliverManyWebhooksRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :body, -> { Peal::Types::WebhookRedeliveryRequest }, optional: false, nullable: false
      end
    end
  end
end
