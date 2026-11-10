# frozen_string_literal: true

module Peal
  module Partner
    module Types
      class NewCustomerWorkspace < Internal::Types::Model
        field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "idempotency-key"

        field :external_id, -> { String }, optional: true, nullable: false, api_name: "externalId"

        field :name, -> { String }, optional: false, nullable: false
      end
    end
  end
end
