# frozen_string_literal: true

module Peal
  module Invitations
    module Types
      class RevokeInvitationsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :invitation_id, -> { String }, optional: false, nullable: false, api_name: "invitationId"
      end
    end
  end
end
