# frozen_string_literal: true

module Peal
  module Invitations
    module Types
      class ListInvitationsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"
      end
    end
  end
end
