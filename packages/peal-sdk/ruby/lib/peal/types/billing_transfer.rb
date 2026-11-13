# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BillingTransfer < Internal::Types::Model
      field :expires_at, -> { String }, optional: false, nullable: false, api_name: "expiresAt"

      field :offered_at, -> { String }, optional: false, nullable: false, api_name: "offeredAt"

      field :offered_by, -> { String }, optional: false, nullable: false, api_name: "offeredBy"

      field :to_user_id, -> { String }, optional: false, nullable: false, api_name: "toUserId"
    end
  end
end
