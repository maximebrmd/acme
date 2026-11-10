# frozen_string_literal: true

module Peal
  module Signatures
    module Types
      class ListSignaturesRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"
      end
    end
  end
end
