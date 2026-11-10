# frozen_string_literal: true

module Peal
  module Signatures
    module Types
      class DeleteSignaturesRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :signature_id, -> { String }, optional: false, nullable: false, api_name: "signatureId"
      end
    end
  end
end
