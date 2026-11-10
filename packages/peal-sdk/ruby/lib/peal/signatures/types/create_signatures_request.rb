# frozen_string_literal: true

module Peal
  module Signatures
    module Types
      class CreateSignaturesRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :body, -> { Peal::Types::SignatureDetails }, optional: false, nullable: false
      end
    end
  end
end
