# frozen_string_literal: true

module Peal
  module Review
    module Types
      class UpdateSettingsReviewRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :body, -> { Peal::Types::ReviewSettings }, optional: false, nullable: false
      end
    end
  end
end
