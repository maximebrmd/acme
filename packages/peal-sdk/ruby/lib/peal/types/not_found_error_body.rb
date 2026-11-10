# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NotFoundErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::ReviewLinkNotFoundEncoded }, key: "REVIEW_LINK_NOT_FOUND"

      member -> { Peal::Types::WorkspaceNotFoundEncoded }, key: "WORKSPACE_NOT_FOUND"
    end
  end
end
