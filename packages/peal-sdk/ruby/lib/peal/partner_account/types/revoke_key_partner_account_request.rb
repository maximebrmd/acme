# frozen_string_literal: true

module Peal
  module PartnerAccount
    module Types
      class RevokeKeyPartnerAccountRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :partner_key_id, -> { String }, optional: false, nullable: false, api_name: "partnerKeyId"
      end
    end
  end
end
