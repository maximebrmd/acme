# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ConflictErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::AlreadyMemberEncoded }, key: "ALREADY_MEMBER"

      member -> { Peal::Types::TooManyInvitationsEncoded }, key: "TOO_MANY_INVITATIONS"
    end
  end
end
